# pylint: disable = C0111, C0103, C0411, C0301, W0102, C0330, W0603
"""This module is used to extract the key_holds times and digraph
   up_down times from the raw events of the subjects."""
import read_write
import numpy as np
import operator
import time
import general_purpose
import sys
import py_node_communication as pynocomm

# All limits are in milliseconds
KEY_HOLD_UPPER_LIMIT = 400
KEY_HOLD_LOWER_LIMIT = 0
DIGRAPH_UP_DOWN_UPPER_LIMIT = 800
DIGRAPH_UP_DOWN_LOWER_LIMIT = -400


def _my_search_event(eventlist, event, key=''):
    """Searches a list of events for specific event and the specific key if specified
       \n eventlist: A list of raw events of a subject
       \n event: Can be 'keystrokeDown' or 'keystrokeUp'
       \n key: It specifies a spefic key (e.g. KeyE or Space)
    """
    if key == '':
        for i, val in enumerate(eventlist):
            if val['event'] == event:
                return i, val
    else:
        for i, val in enumerate(eventlist):
            if val['event'] == event and val['key'] == key:
                return i, val
    pynocomm.send_to_node(
        'Returning -1 from my searchevent' + str(event) + str(key))
    return -1, {}


def _digraph_all(subject_events_data, ignore_space=False, sortByDigraph=True):
    """Extracts the subject's digraph timings of key_holds and up_down by the raw events.
       \n subject_events_data: The raw events list
       \n ignore_space: Boolean. If True it ignores space
       \n sortByDigraph: Boolean. If True it sorts data by digraph
       \n Returns: An list of dicts  [{'digraph', 'points'}]
       where points is a nx3 numpy array with x,y,z as key_hold_1, key_hold_2 and up_down timings of the digraph
    """
    ret = []

    # work with a copy because the pop method changes the list of dict :/
    events = subject_events_data[:]

    if ignore_space is True:
        events = [evt for evt in events if evt['data'] != 'Space']

    while True:
        if len(events) <= 2:
            break

        # The next keyDown event will be the first
        key_1_down_event = events[0]
        if key_1_down_event['event'] != 'keystrokeDown':
            pynocomm.send_to_node(
                '...digraph_all: Continuing, first event is not keydown ->' + str(events[0]))
            events.pop(0)
            continue

        # Find the respective keyUp event of key_1
        # DEBUGGING
        # pynocomm.send_to_node(str(key_1_down_event))
        # DEBUGGING
        key_1_up_event_index, key_1_up_event = _my_search_event(
            events[1:], 'keystrokeUp', key_1_down_event['key'])
        if key_1_up_event_index == -1:
            pynocomm.send_to_node(
                '...digraph_all: Continuing, Couldnt find keystrokeUp event for key = ' + str(key_1_down_event['key']))
            events.pop(0)
            continue
        else:
            key_1_up_event_index += 1

        # Find the following keyDown event after the keyDown of key_1
        key_2_down_event_index, key_2_down_event = _my_search_event(
            events[1:], 'keystrokeDown')
        if key_2_down_event_index == -1:
            pynocomm.send_to_node('1993: What now?')
        else:
            key_2_down_event_index += 1

        # Find the respective keyUp event of key_2
        key_2_up_event_index, key_2_up_event = _my_search_event(
            events[key_2_down_event_index + 1:], 'keystrokeUp', key_2_down_event['key'])
        if key_2_up_event_index == -1:
            # Just pop and continue (it's noise)
            events.pop(0)
            events.pop(key_1_up_event_index - 1)  # index has changed now
            pynocomm.send_to_node('1994: Removed Noise')
            continue
        else:
            key_2_up_event_index += key_2_down_event_index + 1

        # Calculate
        # Here if I want down_down: "down_down": key_2_down_event['timestamp'] - key_1_down_event['timestamp'],
        digraph_obj = {
            "digraph": key_1_down_event['key'] + key_2_down_event['key'],
            "up_down": key_2_down_event['timestamp'] - key_1_up_event['timestamp'],
            "key_holds": [key_1_up_event['timestamp'] - key_1_down_event['timestamp'], key_2_up_event['timestamp'] - key_2_down_event['timestamp']]
        }
        xyz = np.array([[digraph_obj['key_holds'][0],
                         digraph_obj['key_holds'][1], digraph_obj['up_down']]])
        # Store appropriately
        if (general_purpose.is_not_extreme_outlier(digraph_obj['up_down'], DIGRAPH_UP_DOWN_LOWER_LIMIT, DIGRAPH_UP_DOWN_UPPER_LIMIT)
            and general_purpose.is_not_extreme_outlier(digraph_obj['key_holds'][0], KEY_HOLD_LOWER_LIMIT, KEY_HOLD_UPPER_LIMIT)
                and general_purpose.is_not_extreme_outlier(digraph_obj['key_holds'][1], KEY_HOLD_LOWER_LIMIT, KEY_HOLD_UPPER_LIMIT)):
            if ret == []:
                ret.append({"digraph": digraph_obj['digraph'],
                            "points": xyz})
            else:
                tmpi = -1
                for i, val in enumerate(ret):
                    if val['digraph'] == digraph_obj['digraph']:
                        tmpi = i
                        break
                if tmpi != -1:
                    ret[tmpi]['points'] = np.append(
                        ret[tmpi]['points'], xyz, axis=0)
                else:
                    ret.append({"digraph": digraph_obj['digraph'],
                                "points": xyz})
        # Update and remove the 1st key down and up for next iteration
        events.pop(0)
        events.pop(key_1_up_event_index - 1)  # index has changed now

    # Sort by Digraph
    if sortByDigraph is True:
        ret = sorted(ret, key=operator.itemgetter('digraph'))
    return ret


def one(doc, ignore_space=False, logg=True):
    """Extracts digraph up_down and key_holds times from subject doc events
    \nReturns: Object with 'id', 'subject', 'track_code' and 'data': as calculated from digraph_all func
    """
    start = time.time()
    ret = {
        "_id": doc['_id'],
        "subject": doc['subject'], "track_code": doc['track_code'],
        "data": _digraph_all(doc['sessions']['data'], ignore_space=ignore_space, sortByDigraph=True)}
    if logg is True:
        pynocomm.send_to_node(
            '-Subject Timings of "' + doc['subject'] + '" extracted in ' + str(time.time() - start) + ' seconds.')
    return ret


def all(docs, write_to_json=True, ignore_space=False, filename='./trained-projects/subjects-data'):
    """Just some wrapper that takes all docs
    \nReturns: [{'_id':'', 'subject': '', 'track_code': '', data: {[...]]}}]
    """
    ret = []
    for subject_doc in docs:
        ret.append(one(subject_doc, ignore_space=ignore_space))
    if write_to_json is True:
        read_write.write_timings_to_local(ret, filename)
    return ret


def main():
    """It is called by node.js to extract data of all subjects."""
    _DATA_ = pynocomm.receive_from_node()
    DOCS = _DATA_['docs']
    WRITE_EXTRACTED_TO_JSON = _DATA_['writeExtractedToJson']

    TIM_LIMITS = _DATA_['timing_limits']

    global KEY_HOLD_LOWER_LIMIT
    KEY_HOLD_LOWER_LIMIT = TIM_LIMITS['key_hold']['min']
    global KEY_HOLD_UPPER_LIMIT
    KEY_HOLD_UPPER_LIMIT = TIM_LIMITS['key_hold']['max']
    global DIGRAPH_UP_DOWN_LOWER_LIMIT
    DIGRAPH_UP_DOWN_LOWER_LIMIT = TIM_LIMITS['digraph_up_down']['min']
    global DIGRAPH_UP_DOWN_UPPER_LIMIT
    DIGRAPH_UP_DOWN_UPPER_LIMIT = TIM_LIMITS['digraph_up_down']['max']

    # Convert numpy arr to list, to be JSON serializable
    _data = all(DOCS, write_to_json=WRITE_EXTRACTED_TO_JSON,
                filename='./trained-projects/' + DOCS[0]['track_code'])
    for d in _data:
        for p in d['data']:
            p['points'] = p['points'].tolist()
    pynocomm.send_to_node(_data)


if __name__ == '__main__':
    main()
